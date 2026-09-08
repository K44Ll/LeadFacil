import {
  Building2,
  Camera,
  Globe,
  Lightbulb,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Star,
} from "lucide-react";
import type { OutreachLeadContext } from "@/lib/ai/lead-context";

export function LeadSummary({ lead }: { lead: OutreachLeadContext }) {
  const facts = [
    { label: "Segmento", value: lead.category, icon: Building2 },
    { label: "Localização", value: lead.location, icon: MapPin },
    { label: "Website", value: lead.website, icon: Globe },
    { label: "Instagram", value: lead.instagram, icon: Camera },
    { label: "WhatsApp", value: lead.whatsapp, icon: MessageCircle },
    { label: "Telefone", value: lead.phone, icon: Phone },
    { label: "Email", value: lead.email, icon: Mail },
    { label: "Reputação", value: lead.publicReputation, icon: Star },
  ].filter((fact) => fact.value);

  return (
    <aside className="rounded-xl border bg-muted/25 p-4 lg:sticky lg:top-0">
      <p className="eyebrow mb-2">Dados usados pela IA</p>
      <h3 className="text-sm font-medium">{lead.name}</h3>
      {lead.description && (
        <p className="mt-2 line-clamp-4 text-[11px] leading-5 text-muted-foreground">
          {lead.description}
        </p>
      )}
      <dl className="mt-4 space-y-3 border-t pt-4">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="flex items-center gap-2.5 text-[9px] uppercase tracking-wide text-muted-foreground">
              <fact.icon className="size-3.5 shrink-0" />
              {fact.label}
            </dt>
            <dd className="mt-0.5 break-words pl-6 text-[11px] leading-4">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
      {lead.verifiedDigitalSignals?.length ? (
        <div className="mt-4 border-t pt-4">
          <p className="flex items-center gap-2 text-[10px] font-medium">
            <Lightbulb className="size-3.5 text-primary" />
            Sinais verificados
          </p>
          <ul className="mt-2 space-y-1.5 text-[10px] leading-4 text-muted-foreground">
            {lead.verifiedDigitalSignals.map((signal) => (
              <li key={signal} className="flex gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                {signal}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {lead.userNotes && (
        <div className="mt-4 border-t pt-4">
          <p className="text-[10px] font-medium">Suas anotações</p>
          <p className="mt-1 line-clamp-4 text-[10px] leading-4 text-muted-foreground">
            {lead.userNotes}
          </p>
        </div>
      )}
      <p className="mt-4 border-t pt-3 text-[9px] leading-4 text-muted-foreground">
        Campos ausentes não são enviados nem completados pela IA.
      </p>
    </aside>
  );
}
