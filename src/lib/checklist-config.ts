export const CHECKLIST_ITEMS = [
  {
    key: 'documentos_presentes',
    label: 'Documento do veículo presente (CRLV / DUT)',
    pdfLabel: 'Documento (CRLV / DUT)',
  },
  {
    key: 'chaves_presentes',
    label: 'Chaves do veículo presentes',
    pdfLabel: 'Chaves do veículo',
  },
  {
    key: 'placa_identificavel',
    label: 'Placa identificável',
    pdfLabel: 'Placa identificável',
  },
  {
    key: 'chassi_identificavel',
    label: 'Chassi identificável',
    pdfLabel: 'Chassi identificável',
  },
  {
    key: 'vidros_intactos',
    label: 'Vidros intactos',
    pdfLabel: 'Vidros intactos',
  },
  {
    key: 'pneus_presentes',
    label: 'Pneus presentes (4 + estepe)',
    pdfLabel: 'Pneus (4 + estepe)',
  },
  {
    key: 'motor_presente',
    label: 'Motor presente',
    pdfLabel: 'Motor presente',
  },
  {
    key: 'bateria_presente',
    label: 'Bateria presente',
    pdfLabel: 'Bateria presente',
  },
  {
    key: 'macaco_chave_roda',
    label: 'Macaco + chave de roda',
    pdfLabel: 'Macaco + chave de roda',
  },
  {
    key: 'triangulo_presente',
    label: 'Triângulo de sinalização',
    pdfLabel: 'Triângulo de sinalização',
  },
  {
    key: 'extintor_presente',
    label: 'Extintor de incêndio',
    pdfLabel: 'Extintor de incêndio',
  },
] as const;

export type ChecklistKey = (typeof CHECKLIST_ITEMS)[number]['key'];
