import { Collection } from '../models/collection';
import {
  PERSONALISATION_FIELDS,
  ProductConfiguration,
  ProductOption,
  resolveEnvelopePrintOptions,
} from '../models/product-options';
import { OrderMode } from './pricing';

export interface ConfigurationDetail {
  label: string;
  value: string;
}

function optionLabel(
  options: readonly ProductOption[] | undefined,
  id: string | undefined,
): string | undefined {
  return id ? options?.find((option) => option.id === id)?.label : undefined;
}

export function describeConfiguration(
  product: Collection | undefined,
  configuration: ProductConfiguration,
  mode: OrderMode = 'standard',
): ConfigurationDetail[] {
  const details: ConfigurationDetail[] = [];
  if (mode === 'sample') {
    details.push({ label: 'Rodzaj zamówienia', value: 'Próbne zaproszenie' });
  }

  const paper = optionLabel(product?.paper_options, configuration.paperId);
  if (paper) {
    details.push({ label: 'Papier', value: paper });
  }

  const foil = optionLabel(product?.foil_options, configuration.foilId);
  if (foil) {
    details.push({ label: 'Folia', value: foil });
  }

  const envelope = optionLabel(product?.envelope_options, configuration.envelopeId);
  if (envelope) {
    details.push({ label: 'Koperta', value: envelope });
  }

  if (configuration.guestPersonalisation) {
    const print = resolveEnvelopePrintOptions(product?.envelope_print).find(
      (option) => option.id === configuration.envelopePrintId,
    );
    details.push({ label: 'Personalizacja gości', value: print?.label ?? 'Tak' });
    if (configuration.envelopeText) {
      details.push({ label: 'Tekst na klapie', value: configuration.envelopeText });
    }
  }

  if (configuration.express) {
    details.push({ label: 'Realizacja', value: 'Express' });
  }

  for (const field of PERSONALISATION_FIELDS) {
    const value = configuration.personalisation?.[field.key];
    if (value) {
      details.push({ label: field.label, value });
    }
  }

  return details;
}

export function configurationSummaryText(
  product: Collection | undefined,
  configuration: ProductConfiguration,
  mode: OrderMode = 'standard',
): string {
  return describeConfiguration(product, configuration, mode)
    .map((detail) => `${detail.label}: ${detail.value}`)
    .join('; ');
}
