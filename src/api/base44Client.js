// @ts-nocheck
import { supabase } from "@/lib/supabaseClient";

const READ_CACHE_TTL_MS = 60 * 1000;
const READ_TIMEOUT_MS = 12000;
const READ_RETRIES = 1;
const WRITE_TIMEOUT_MS = 15000;
const readCache = new Map();
const inflightReads = new Map();

const TABLE_BY_ENTITY = {
	OrdenTrabajo: "orden_trabajo",
	LineaAvaluo: "linea_avaluo",
	RequerimientoCompra: "requerimiento_compra",
	PiezaCatalogo: "pieza",
	PrecioPieza: "precio_pieza",
	Inventario: "inventario",
	MovimientoInventario: "movimiento_inventario",
	Cliente: "clientes",
	Usuario: "usuario",
	Estado: "estado",
	Aseguradora: "aseguradora"
};

const toError = (error, fallbackMessage) => {
	if (!error) return new Error(fallbackMessage);
	return new Error(error.message || fallbackMessage);
};

const stableStringify = (value) => {
	if (value === null || value === undefined) return String(value);
	if (typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(",")}]`;
	const keys = Object.keys(value).sort();
	return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
};

const cloneRows = (rows) => {
	if (!Array.isArray(rows)) return rows;
	return rows.map((row) => (row && typeof row === "object" ? { ...row } : row));
};

const getCachedRows = (key) => {
	const entry = readCache.get(key);
	if (!entry) return null;
	if (Date.now() > entry.expiresAt) {
		readCache.delete(key);
		return null;
	}
	return cloneRows(entry.data);
};

const setCachedRows = (key, data) => {
	readCache.set(key, {
		data: cloneRows(data || []),
		expiresAt: Date.now() + READ_CACHE_TTL_MS
	});
};

const withTimeout = async (promise, timeoutMs, label) => {
	let timer = null;
	const timeoutPromise = new Promise((_, reject) => {
		timer = setTimeout(() => reject(new Error(`Timeout en ${label}`)), timeoutMs);
	});

	try {
		return await Promise.race([promise, timeoutPromise]);
	} finally {
		if (timer) clearTimeout(timer);
	}
};

const executeReadSafely = async (runner, fallbackMessage) => {
	let lastError = null;

	for (let attempt = 0; attempt <= READ_RETRIES; attempt += 1) {
		try {
			return await runner();
		} catch (error) {
			lastError = error;
		}
	}

	console.error(fallbackMessage, lastError);
	return [];
};

const getCachedOrFetch = async (key, fetcher) => {
	const cached = getCachedRows(key);
	if (cached) return cached;

	const inflight = inflightReads.get(key);
	if (inflight) return cloneRows(await inflight);

	const pending = (async () => {
		const data = await fetcher();
		setCachedRows(key, data);
		return data;
	})();

	inflightReads.set(key, pending);
	try {
		return cloneRows(await pending);
	} finally {
		inflightReads.delete(key);
	}
};

const invalidateTableCache = (table) => {
	for (const key of readCache.keys()) {
		if (key.startsWith(`${table}:`)) {
			readCache.delete(key);
		}
	}

	for (const key of inflightReads.keys()) {
		if (key.startsWith(`${table}:`)) {
			inflightReads.delete(key);
		}
	}
};

const applyFilter = (query, criteria = {}) => {
	let q = query;
	Object.entries(criteria || {}).forEach(([key, value]) => {
		if (Array.isArray(value)) {
			q = q.in(key, value);
		} else if (value === null) {
			q = q.is(key, null);
		} else {
			q = q.eq(key, value);
		}
	});
	return q;
};

const buildEntityApi = (entityName) => {
	const table = TABLE_BY_ENTITY[entityName];
	if (!table) {
		throw new Error(`No hay tabla configurada para la entidad ${entityName}`);
	}

	return {
		async list(sort = null, limit = null) {
			const key = `${table}:list:${stableStringify({ sort, limit })}`;

			return executeReadSafely(
				() =>
					getCachedOrFetch(key, async () => {
						let q = supabase.from(table).select("*");

						if (typeof sort === "string" && sort.length > 0) {
							const ascending = !sort.startsWith("-");
							const column = ascending ? sort : sort.slice(1);
							q = q.order(column, { ascending });
						}

						if (typeof limit === "number") {
							q = q.limit(limit);
						}

						const { data, error } = await withTimeout(q, READ_TIMEOUT_MS, `list ${entityName}`);
						if (error) {
							const fallbackQuery = supabase.from(table).select("*");
							const fallback = await withTimeout(
								typeof limit === "number" ? fallbackQuery.limit(limit) : fallbackQuery,
								READ_TIMEOUT_MS,
								`fallback list ${entityName}`
							);
							if (fallback.error) throw toError(error, `Error listando ${entityName}`);
							return fallback.data || [];
						}
						return data || [];
					}),
				`Lectura fallida en list(${entityName})`
			);
		},

		async filter(criteria = {}) {
			const key = `${table}:filter:${stableStringify(criteria || {})}`;

			return executeReadSafely(
				() =>
					getCachedOrFetch(key, async () => {
						let q = supabase.from(table).select("*");
						q = applyFilter(q, criteria);
						const { data, error } = await withTimeout(q, READ_TIMEOUT_MS, `filter ${entityName}`);
						if (error) throw toError(error, `Error filtrando ${entityName}`);
						return data || [];
					}),
				`Lectura fallida en filter(${entityName})`
			);
		},

		async create(payload) {
			const { data, error } = await withTimeout(
				supabase.from(table).insert([payload]).select().single(),
				WRITE_TIMEOUT_MS,
				`create ${entityName}`
			);
			if (error) throw toError(error, `Error creando ${entityName}`);
			invalidateTableCache(table);
			return data;
		},

		async update(id, payload) {
			const { data, error } = await withTimeout(
				supabase.from(table).update(payload).eq("id", id).select().single(),
				WRITE_TIMEOUT_MS,
				`update ${entityName}`
			);
			if (error) throw toError(error, `Error actualizando ${entityName}`);
			invalidateTableCache(table);
			return data;
		},

		async delete(id) {
			const { error } = await withTimeout(
				supabase.from(table).delete().eq("id", id),
				WRITE_TIMEOUT_MS,
				`delete ${entityName}`
			);
			if (error) throw toError(error, `Error eliminando ${entityName}`);
			invalidateTableCache(table);
			return { success: true };
		}
	};
};

const normalizeRole = (rawRole) => {
	if (typeof rawRole !== "string") return "user";
	const normalized = rawRole
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.toLowerCase();

	const roleAliases = {
		admin: "admin",
		administrador: "admin",
		dueño: "admin",
		dueno: "admin",
		owner: "admin",
		gerente: "gerente",
		manager: "gerente",
		empleado: "empleado",
		tecnico: "empleado",
		user: "user",
		usuario: "user",
		secretaria: "user"
	};

	return roleAliases[normalized] || "user";
};

const normalizeUser = (user, profile = null) => {
	if (!user) return null;
	const roleRaw = profile?.rol || user.user_metadata?.role || user.app_metadata?.role || "user";
	const role = normalizeRole(roleRaw);
	return {
		...user,
		role,
		full_name: profile?.nombre || user.user_metadata?.full_name || user.user_metadata?.name || user.email,
		perfil_id: profile?.id || null,
		perfil_rol: profile?.rol || null
	};
};

const getProfileByAuthUser = async (authUser) => {
	if (!authUser) return null;

	let profile = null;

	if (authUser.id) {
		const byUid = await supabase
			.from("usuario")
			.select("id, email, nombre, rol, uid_auth")
			.eq("uid_auth", authUser.id)
			.maybeSingle();

		if (!byUid.error) {
			profile = byUid.data || null;
		}
	}

	if (!profile && authUser.email) {
		const byEmail = await supabase
			.from("usuario")
			.select("id, email, nombre, rol, uid_auth")
			.eq("email", authUser.email)
			.maybeSingle();

		if (!byEmail.error) {
			profile = byEmail.data || null;
		}
	}

	if (profile && !profile.uid_auth && authUser.id) {
		const { error: linkError } = await supabase
			.from("usuario")
			.update({ uid_auth: authUser.id })
			.eq("id", profile.id);

		if (!linkError) {
			profile = {
				...profile,
				uid_auth: authUser.id
			};
		}
	}

	return profile;
};

const auth = {
	async me() {
		const { data, error } = await supabase.auth.getUser();
		if (error || !data?.user) {
			throw toError(error, "Usuario no autenticado");
		}

		const profile = await getProfileByAuthUser(data.user);
		return normalizeUser(data.user, profile);
	},

	async loginViaEmailPassword(email, password) {
		const { error } = await supabase.auth.signInWithPassword({ email, password });
		if (error) throw toError(error, "No se pudo iniciar sesión");
		return true;
	},

	async loginWithProvider(provider, redirectPath = "/") {
		const redirectTo = `${window.location.origin}${redirectPath}`;
		const { error } = await supabase.auth.signInWithOAuth({
			provider,
			options: { redirectTo }
		});
		if (error) throw toError(error, "No se pudo iniciar sesión con proveedor");
		return true;
	},

	async register({ email, password }) {
		const { error } = await supabase.auth.signUp({ email, password });
		if (error) throw toError(error, "No se pudo registrar la cuenta");
		return true;
	},

	async verifyOtp({ email, otpCode }) {
		const { data, error } = await supabase.auth.verifyOtp({
			email,
			token: otpCode,
			type: "signup"
		});
		if (error) throw toError(error, "Código inválido");
		const authUser = data?.user || data?.session?.user;
		const profile = await getProfileByAuthUser(authUser);
		return {
			access_token: data?.session?.access_token || null,
			user: normalizeUser(authUser, profile)
		};
	},

	async resendOtp(email) {
		const { error } = await supabase.auth.resend({ type: "signup", email });
		if (error) throw toError(error, "No se pudo reenviar el código");
		return true;
	},

	async resetPasswordRequest(email) {
		const redirectTo = `${window.location.origin}/reset-password`;
		const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
		if (error) throw toError(error, "No se pudo enviar el correo de recuperación");
		return true;
	},

	async resetPassword({ resetToken, newPassword }) {
		if (resetToken) {
			const verify = await supabase.auth.verifyOtp({ token: resetToken, type: "recovery" });
			if (verify.error) throw toError(verify.error, "Token de recuperación inválido");
		}
		const { error } = await supabase.auth.updateUser({ password: newPassword });
		if (error) throw toError(error, "No se pudo restablecer la contraseña");
		return true;
	},

	setToken() {
		return true;
	},

	async logout(redirectTo = null) {
		await supabase.auth.signOut();
		if (redirectTo !== false) {
			window.location.href = "/login";
		}
	},

	redirectToLogin() {
		window.location.href = "/login";
	}
};

const integrations = {
	Core: {
		async UploadFile({ file }) {
			if (!file) throw new Error("Archivo inválido");

			const fileToDataUrl =
				typeof FileReader !== "undefined"
					? (inputFile) =>
						new Promise((resolve, reject) => {
							const reader = new FileReader();
							reader.onload = () => resolve(reader.result);
							reader.onerror = () => reject(new Error("No se pudo leer la foto"));
							reader.readAsDataURL(inputFile);
						})
					: null;

			const ext = file.name?.split(".").pop() || "bin";
			const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
			const { error } = await supabase.storage.from("uploads").upload(path, file, { upsert: false });

			if (error) {
				const message = String(error.message || "").toLowerCase();
				const canFallbackInline =
					!!fileToDataUrl &&
					(message.includes("bucket not found") ||
						message.includes("not found") ||
						message.includes("permission") ||
						message.includes("row-level security") ||
						message.includes("unauthorized"));

				if (canFallbackInline) {
					const dataUrl = await fileToDataUrl(file);
					return {
						file_url: typeof dataUrl === "string" ? dataUrl : "",
						persisted_inline: true,
						storage_error: error.message || "Storage no disponible"
					};
				}

				throw toError(error, "No se pudo subir la foto");
			}

			const { data } = supabase.storage.from("uploads").getPublicUrl(path);
			return { file_url: data.publicUrl };
		}
	}
};

export const apiClient = {
	entities: {
		OrdenTrabajo: buildEntityApi("OrdenTrabajo"),
		LineaAvaluo: buildEntityApi("LineaAvaluo"),
		RequerimientoCompra: buildEntityApi("RequerimientoCompra"),
		PiezaCatalogo: buildEntityApi("PiezaCatalogo"),
		PrecioPieza: buildEntityApi("PrecioPieza"),
		Inventario: buildEntityApi("Inventario"),
		MovimientoInventario: buildEntityApi("MovimientoInventario"),
		Cliente: buildEntityApi("Cliente"),
		Usuario: buildEntityApi("Usuario"),
		Estado: buildEntityApi("Estado"),
		Aseguradora: buildEntityApi("Aseguradora")
	},
	auth,
	integrations
};

// Alias de compatibilidad para no romper imports existentes.
export const base44 = apiClient;
