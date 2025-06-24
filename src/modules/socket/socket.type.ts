import { Socket } from 'socket.io';

export interface ClientData {
  socket: Socket;
  userId: number;
}

export class ClientMap {
  private readonly connectedClients: Map<string, ClientData> = new Map();

  public addClient(id: string, socket: Socket, userId: number): void {
    this.connectedClients.set(id, { socket, userId });
  }

  public getClientById(id: string): ClientData | undefined {
    return this.connectedClients.get(id);
  }

  public getClientsByUserId(userId: number): ClientData[] {
    const clientsWithUserId: ClientData[] = [];
    for (const [, clientData] of this.connectedClients) {
      if (clientData.userId === userId) {
        clientsWithUserId.push(clientData);
      }
    }
    return clientsWithUserId;
  }

  public getClients(): ClientData[] {
    return Array.from(this.connectedClients.values());
  }

  public removeClient(id: string): void {
    this.connectedClients.delete(id);
  }

  public getConnectedUsersCount(): number {
    return this.connectedClients.size;
  }
}
