'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MapPin, Home, Euro, Check, Phone, Mail, ArrowRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LeadForm } from './LeadForm';
import { formatCurrency } from '@/lib/utils';

interface Props {
  promotion: any;
  referralCode?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export function LandingPage({ promotion, referralCode, utmSource, utmMedium, utmCampaign }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  const featuredUnits = (promotion.units || []).filter((u: any) => u.featured && u.status === 'AVAILABLE');
  const availableUnits = (promotion.units || []).filter((u: any) => u.status === 'AVAILABLE');

  return (
    <div className="min-h-screen bg-portalon-stone">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden portalon-gradient">
        {promotion.heroImageUrl && (
          <div className="absolute inset-0 opacity-20">
            <Image
              src={promotion.heroImageUrl}
              alt={promotion.name}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        <div className="relative z-10 container max-w-5xl mx-auto px-6 py-24 text-center text-white">
          <div className="animate-fade-in">
            <Badge className="mb-6 bg-portalon-gold text-white border-none px-4 py-1.5 text-xs tracking-widest uppercase">
              Red Privada de Distribución
            </Badge>

            <h1 className="font-serif text-5xl md:text-7xl font-bold mb-6 leading-tight">
              {promotion.name}
            </h1>

            {promotion.headline && (
              <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-3xl mx-auto leading-relaxed">
                {promotion.headline}
              </p>
            )}

            <div className="flex items-center justify-center gap-2 text-white/60 mb-12">
              <MapPin className="h-4 w-4" />
              <span className="text-sm tracking-wide">{promotion.location || promotion.city}</span>
            </div>

            {promotion.priceMin && (
              <div className="mb-10">
                <p className="text-white/50 text-sm mb-1 tracking-widest uppercase">Desde</p>
                <p className="text-4xl font-serif font-bold text-portalon-gold-light">
                  {formatCurrency(Number(promotion.priceMin), promotion.currency)}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-portalon-gold hover:bg-portalon-gold/90 text-white px-8 py-6 text-base font-medium tracking-wide shadow-xl"
                onClick={() => setShowForm(true)}
              >
                Solicitar información <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-base"
                onClick={() => document.getElementById('units')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Ver unidades disponibles
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center pt-2">
            <div className="w-1 h-2 bg-white/50 rounded-full" />
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white border-b py-8">
        <div className="container max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl font-serif font-bold text-foreground">{promotion.totalUnits}</p>
              <p className="text-sm text-muted-foreground mt-1">Unidades totales</p>
            </div>
            <div>
              <p className="text-3xl font-serif font-bold text-green-600">{promotion.unitsAvailable}</p>
              <p className="text-sm text-muted-foreground mt-1">Disponibles</p>
            </div>
            <div>
              <p className="text-3xl font-serif font-bold text-foreground">
                {promotion.city || 'Córdoba'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Ubicación</p>
            </div>
            <div>
              <p className="text-3xl font-serif font-bold text-foreground">
                {promotion.currency || 'EUR'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Moneda</p>
            </div>
          </div>
        </div>
      </section>

      {/* Description */}
      {promotion.fullDescription && (
        <section className="py-20 bg-white">
          <div className="container max-w-4xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <p className="text-xs tracking-widest text-portalon-gold uppercase mb-4">
                  La oportunidad
                </p>
                <h2 className="font-serif text-4xl font-bold text-foreground mb-6">
                  Una inversión excepcional
                </h2>
                <div className="prose prose-gray max-w-none">
                  {promotion.fullDescription.split('\n').map((p: string, i: number) => (
                    p.trim() && <p key={i} className="text-muted-foreground leading-relaxed mb-4">{p.trim()}</p>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                {[
                  'Ubicación en patrimonio de la humanidad',
                  'Alta rentabilidad turística contrastada',
                  'Acabados premium certificados',
                  'Gestión profesional incluida',
                  'Proceso de compra asistido',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-portalon-gold/10 flex items-center justify-center flex-shrink-0">
                      <Check className="h-4 w-4 text-portalon-gold" />
                    </div>
                    <span className="text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Units */}
      {availableUnits.length > 0 && (
        <section id="units" className="py-20 bg-portalon-stone">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="text-center mb-12">
              <p className="text-xs tracking-widest text-portalon-gold uppercase mb-4">Inventario</p>
              <h2 className="font-serif text-4xl font-bold">Unidades disponibles</h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableUnits.map((unit: any) => (
                <div
                  key={unit.id}
                  className={`bg-white rounded-lg p-6 border hover:shadow-md transition-shadow ${unit.featured ? 'ring-2 ring-portalon-gold' : ''}`}
                >
                  {unit.featured && (
                    <Badge className="mb-3 bg-portalon-gold text-white border-none text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Destacado
                    </Badge>
                  )}
                  <h3 className="font-semibold text-lg mb-2">{unit.title || unit.unitCode}</h3>

                  <div className="grid grid-cols-2 gap-2 mb-4 text-sm text-muted-foreground">
                    {unit.bedrooms !== null && (
                      <span>{unit.bedrooms} dormitorio{unit.bedrooms !== 1 ? 's' : ''}</span>
                    )}
                    {unit.bathrooms !== null && (
                      <span>{unit.bathrooms} baño{unit.bathrooms !== 1 ? 's' : ''}</span>
                    )}
                    {unit.interiorM2 && <span>{Number(unit.interiorM2)} m² interior</span>}
                    {unit.exteriorM2 && <span>{Number(unit.exteriorM2)} m² exterior</span>}
                    {unit.parkingIncluded && <span>Parking incluido</span>}
                    {unit.jacuzzi && <span>Jacuzzi</span>}
                  </div>

                  {unit.price && (
                    <p className="text-xl font-serif font-bold text-foreground">
                      {formatCurrency(Number(unit.price), promotion.currency)}
                    </p>
                  )}

                  <Button
                    size="sm"
                    className="w-full mt-4 bg-portalon-gold hover:bg-portalon-gold/90 text-white"
                    onClick={() => setShowForm(true)}
                  >
                    Solicitar información
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-24 portalon-gradient text-white">
        <div className="container max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-serif text-4xl font-bold mb-6">
            ¿Quieres más información?
          </h2>
          <p className="text-white/70 mb-10 text-lg">
            Nuestro equipo comercial te atenderá personalmente y te presentará todos los detalles de esta exclusiva oportunidad.
          </p>
          <Button
            size="lg"
            className="bg-portalon-gold hover:bg-portalon-gold/90 text-white px-10 py-6 text-base"
            onClick={() => setShowForm(true)}
          >
            Solicitar información ahora <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-portalon-dark text-white/40 py-8">
        <div className="container max-w-5xl mx-auto px-6 text-center text-sm">
          <p>© {new Date().getFullYear()} Portalon Private Network · Red privada de distribución comercial</p>
        </div>
      </footer>

      {/* Lead Form Modal */}
      {showForm && !formSubmitted && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-serif text-2xl font-bold">Solicitar información</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              <LeadForm
                promotionId={promotion.id}
                referralCode={referralCode}
                utmSource={utmSource}
                utmMedium={utmMedium}
                utmCampaign={utmCampaign}
                onSuccess={() => {
                  setFormSubmitted(true);
                  setShowForm(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Success message */}
      {formSubmitted && (
        <div className="fixed bottom-6 right-6 z-50 bg-white rounded-lg shadow-xl p-6 max-w-sm border-l-4 border-green-500">
          <h4 className="font-semibold text-foreground mb-2">¡Solicitud recibida!</h4>
          <p className="text-sm text-muted-foreground">
            Hemos recibido tu solicitud. Nuestro equipo se pondrá en contacto contigo en las próximas horas.
          </p>
        </div>
      )}
    </div>
  );
}
