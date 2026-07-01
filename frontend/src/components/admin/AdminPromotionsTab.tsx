"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgePercent,
  CheckCircle,
  Edit,
  Loader2,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Promotion, Service } from "@/types";

const emptyPromotionForm = {
  serviceId: "",
  slug: "",
  title: "",
  description: "",
  imageUrl: "/seguidores.png",
  badge: "OFERTA",
  quantity: "1000",
  promoPrice: "",
  compareAtPrice: "",
  maxUses: "",
  startsAt: "",
  expiresAt: "",
  isActive: true,
  sortOrder: "0",
};

type PromotionForm = typeof emptyPromotionForm;

const toLocalDateTimeValue = (value?: string | null) =>
  value ? String(value).slice(0, 16) : "";

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

export default function AdminPromotionsTab() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPromotion, setNewPromotion] = useState<PromotionForm>(emptyPromotionForm);
  const [editingPromotion, setEditingPromotion] = useState<string | null>(null);
  const [promotionForm, setPromotionForm] = useState<PromotionForm>(emptyPromotionForm);

  const serviceOptions = useMemo(
    () => services.filter((service) => service.is_active !== false),
    [services],
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [promosRes, servicesRes] = await Promise.all([
        adminApi.getPromotions(),
        adminApi.getServices(),
      ]);
      setPromotions(promosRes.data.promotions ?? []);
      setServices(servicesRes.data.services ?? []);
    } catch {
      toast.error("No se pudieron cargar las promociones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedService = (form: PromotionForm) =>
    services.find((service) => service.id === form.serviceId);

  const promotionPayload = (form: PromotionForm) => ({
    serviceId: form.serviceId,
    slug: slugify(form.slug || form.title),
    title: form.title.trim(),
    description: form.description.trim() || null,
    imageUrl: form.imageUrl.trim() || null,
    badge: form.badge.trim() || null,
    quantity: Number(form.quantity),
    promoPrice: Number(form.promoPrice),
    compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
    maxUses: form.maxUses ? Number(form.maxUses) : null,
    startsAt: form.startsAt || null,
    expiresAt: form.expiresAt || null,
    isActive: form.isActive,
    sortOrder: Number(form.sortOrder || 0),
  });

  const validatePromotionForm = (form: PromotionForm) => {
    if (!form.serviceId) return "Seleccioná un servicio";
    if (!form.title.trim()) return "El título es requerido";
    if (!slugify(form.slug || form.title)) return "El slug es requerido";
    if (!form.quantity || Number(form.quantity) <= 0) return "La cantidad debe ser mayor a 0";
    if (!form.promoPrice || Number(form.promoPrice) <= 0) return "El precio promocional debe ser mayor a 0";
    if (form.compareAtPrice && Number(form.compareAtPrice) <= 0) return "El precio anterior debe ser mayor a 0";
    if (form.maxUses && Number(form.maxUses) <= 0) return "El límite de usos debe ser mayor a 0";

    const service = selectedService(form);
    if (service) {
      const qty = Number(form.quantity);
      if (qty < service.min_quantity || qty > service.max_quantity) {
        return `La cantidad debe estar entre ${service.min_quantity} y ${service.max_quantity} para este servicio`;
      }
    }

    return null;
  };

  const createPromotion = async () => {
    const error = validatePromotionForm(newPromotion);
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    try {
      await adminApi.createPromotion(promotionPayload(newPromotion));
      toast.success("Promoción creada");
      setNewPromotion(emptyPromotionForm);
      loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo crear la promoción";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const startEditPromotion = (promotion: Promotion) => {
    setEditingPromotion(promotion.id);
    setPromotionForm({
      serviceId: promotion.service_id,
      slug: promotion.slug,
      title: promotion.title,
      description: promotion.description ?? "",
      imageUrl: promotion.image_url ?? "",
      badge: promotion.badge ?? "",
      quantity: String(promotion.quantity),
      promoPrice: String(promotion.promo_price),
      compareAtPrice:
        promotion.compare_at_price == null ? "" : String(promotion.compare_at_price),
      maxUses: promotion.max_uses == null ? "" : String(promotion.max_uses),
      startsAt: toLocalDateTimeValue(promotion.starts_at),
      expiresAt: toLocalDateTimeValue(promotion.expires_at),
      isActive: promotion.is_active !== false,
      sortOrder: String(promotion.sort_order ?? 0),
    });
  };

  const savePromotion = async (promotionId: string) => {
    const error = validatePromotionForm(promotionForm);
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    try {
      await adminApi.updatePromotion(promotionId, promotionPayload(promotionForm));
      toast.success("Promoción actualizada");
      setEditingPromotion(null);
      loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo actualizar la promoción";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const togglePromotionStatus = async (promotion: Promotion) => {
    try {
      await adminApi.updatePromotion(promotion.id, {
        isActive: promotion.is_active === false,
      });
      toast.success("Promoción actualizada");
      loadData();
    } catch {
      toast.error("No se pudo actualizar la promoción");
    }
  };

  const deletePromotion = async (promotionId: string) => {
    const confirmed = window.confirm("¿Desactivar esta promoción?");
    if (!confirmed) return;
    try {
      await adminApi.deletePromotion(promotionId);
      toast.success("Promoción desactivada");
      loadData();
    } catch {
      toast.error("No se pudo desactivar la promoción");
    }
  };

  const PromotionFormFields = ({
    form,
    setForm,
    compact = false,
  }: {
    form: PromotionForm;
    setForm: (form: PromotionForm) => void;
    compact?: boolean;
  }) => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="lg:col-span-2">
          <label className="text-slate-400 text-sm mb-1.5 block">Servicio</label>
          <select
            value={form.serviceId}
            onChange={(event) => setForm({ ...form, serviceId: event.target.value })}
            className="input-field"
          >
            <option value="">Seleccionar servicio</option>
            {serviceOptions.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} ({service.platform} - {service.category})
              </option>
            ))}
          </select>
        </div>
        <div className="lg:col-span-2">
          <label className="text-slate-400 text-sm mb-1.5 block">Título público</label>
          <input
            value={form.title}
            onChange={(event) =>
              setForm({
                ...form,
                title: event.target.value,
                slug: form.slug ? form.slug : slugify(event.target.value),
              })
            }
            className="input-field"
            placeholder="5.000 seguidores Instagram"
          />
        </div>
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Slug</label>
          <input
            value={form.slug}
            onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })}
            className="input-field font-mono"
            placeholder="ig-5000"
          />
        </div>
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Badge</label>
          <input
            value={form.badge}
            onChange={(event) => setForm({ ...form, badge: event.target.value })}
            className="input-field"
            placeholder="OFERTA"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Cantidad</label>
          <input
            type="number"
            min="1"
            value={form.quantity}
            onChange={(event) => setForm({ ...form, quantity: event.target.value })}
            className="input-field"
          />
        </div>
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Precio promo</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.promoPrice}
            onChange={(event) => setForm({ ...form, promoPrice: event.target.value })}
            className="input-field"
            placeholder="9999"
          />
        </div>
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Precio anterior</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.compareAtPrice}
            onChange={(event) => setForm({ ...form, compareAtPrice: event.target.value })}
            className="input-field"
            placeholder="Opcional"
          />
        </div>
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Usos máx.</label>
          <input
            type="number"
            min="1"
            value={form.maxUses}
            onChange={(event) => setForm({ ...form, maxUses: event.target.value })}
            className="input-field"
            placeholder="Sin límite"
          />
        </div>
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Orden</label>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
            className="input-field"
          />
        </div>
        <label className="flex items-center gap-2 text-slate-300 text-sm pt-7">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
            className="w-4 h-4 accent-primary-500"
          />
          Activa
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="lg:col-span-2">
          <label className="text-slate-400 text-sm mb-1.5 block">Imagen pública</label>
          <input
            value={form.imageUrl}
            onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
            className="input-field"
            placeholder="/seguidores.png"
          />
        </div>
        <div className="lg:col-span-2">
          <label className="text-slate-400 text-sm mb-1.5 block">Inicia</label>
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
            className="input-field"
          />
        </div>
        <div className="lg:col-span-2">
          <label className="text-slate-400 text-sm mb-1.5 block">Finaliza</label>
          <input
            type="datetime-local"
            value={form.expiresAt}
            onChange={(event) => setForm({ ...form, expiresAt: event.target.value })}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="text-slate-400 text-sm mb-1.5 block">Descripción pública</label>
        <textarea
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          className="input-field min-h-[90px]"
          placeholder="Ideal para impulsar tu perfil con entrega progresiva y segura."
        />
      </div>

      {!compact && (
        <p className="text-slate-500 text-xs">
          Estos textos se muestran al cliente. Evitá datos técnicos, proveedores o IDs internos.
        </p>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="glass-card p-10 text-center">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
        <p className="text-slate-400">Cargando promociones...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Promociones</h1>
          <p className="text-slate-400 text-sm mt-1">
            Configurá ofertas visibles para clientes con precio cerrado y checkout propio.
          </p>
        </div>
        <button
          onClick={loadData}
          className="btn-secondary flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      <div className="glass-card p-4 sm:p-5 mb-6">
        <h2 className="text-white font-semibold mb-4">Crear promoción</h2>
        <PromotionFormFields form={newPromotion} setForm={setNewPromotion} />
        <div className="flex justify-end mt-4">
          <button
            onClick={createPromotion}
            disabled={saving}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Crear promoción
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {promotions.map((promotion) => (
          <div key={promotion.id} className="glass-card p-4 sm:p-5">
            {editingPromotion === promotion.id ? (
              <div className="space-y-4">
                <PromotionFormFields
                  form={promotionForm}
                  setForm={setPromotionForm}
                  compact
                />
                <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <button
                    onClick={() => setEditingPromotion(null)}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => savePromotion(promotion.id)}
                    disabled={saving}
                    className="btn-primary"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Guardar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-white font-bold text-base">{promotion.title}</span>
                    {promotion.badge && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-200 border border-amber-400/20">
                        {promotion.badge}
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        promotion.is_active
                          ? "bg-green-400/10 text-green-400"
                          : "bg-slate-400/10 text-slate-400"
                      }`}
                    >
                      {promotion.is_active ? "Activa" : "Inactiva"}
                    </span>
                    <code className="text-primary-300 text-xs font-mono">/{promotion.slug}</code>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    <div>
                      <div className="text-slate-500">Servicio</div>
                      <div className="text-slate-200 font-medium truncate">
                        {promotion.service_name ?? "Sin servicio"}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Cantidad</div>
                      <div className="text-slate-200 font-medium">
                        {promotion.quantity.toLocaleString("es-AR")}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Precio</div>
                      <div className="text-slate-200 font-medium">
                        {formatCurrency(Number(promotion.promo_price))}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Usos</div>
                      <div className="text-slate-200 font-medium">
                        {promotion.used_count} / {promotion.max_uses ?? "∞"}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Finaliza</div>
                      <div className="text-slate-200 font-medium">
                        {promotion.expires_at ? formatDate(promotion.expires_at) : "Sin vencimiento"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => startEditPromotion(promotion)}
                    className="btn-secondary px-3"
                    title="Editar promoción"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => togglePromotionStatus(promotion)}
                    className="btn-secondary px-3"
                  >
                    {promotion.is_active ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    onClick={() => deletePromotion(promotion.id)}
                    className="btn-secondary px-3 text-red-400 hover:text-red-300"
                    title="Desactivar promoción"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {promotions.length === 0 && (
          <div className="glass-card p-10 text-center">
            <BadgePercent className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">No hay promociones creadas.</p>
            <p className="text-slate-600 text-xs mt-1">
              Creá la primera para mostrarla en la página pública.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
