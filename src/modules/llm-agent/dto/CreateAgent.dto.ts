export class CreateAgentDto {
  name: string;
  type: string;
  config?: Record<string, unknown>;
  chat_id?: number; // Opcional para asociar un chat existente
  departamento_id?: number; // Opcional para asociar un departamento existente
}
