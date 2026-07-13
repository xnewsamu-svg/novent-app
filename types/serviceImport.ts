export interface ServiceImportItem {
  name: string
  price: number
}

export interface ServiceImportResponse {
  services: ServiceImportItem[]
}

export interface ServiceImportError {
  error: string
}
