import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatUserData } from '@models/ChatUserData.entity';
import { ChatUser } from '@models/ChatUser.entity';

@Injectable()
export class ChatUserDataService {
  constructor(
    @InjectRepository(ChatUserData)
    private readonly chatUserDataRepository: Repository<ChatUserData>,
    @InjectRepository(ChatUser)
    private readonly chatUserRepository: Repository<ChatUser>,
  ) {}

  async createOrUpdate(chatUserId: number, key: string, value: string): Promise<ChatUserData> {
    if (!key?.trim()) {
      throw new BadRequestException('La clave no puede estar vacía');
    }

    if (!value?.trim()) {
      throw new BadRequestException('El valor no puede estar vacío');
    }

    // Verificar que el ChatUser existe
    const chatUser = await this.chatUserRepository.findOne({ where: { id: chatUserId } });
    if (!chatUser) {
      throw new NotFoundException(`ChatUser con ID ${chatUserId} no encontrado`);
    }

    // Buscar si ya existe el dato
    let chatUserData = await this.chatUserDataRepository.findOne({
      where: { chat_user_id: chatUserId, key: key.trim() },
    });

    if (chatUserData) {
      // Actualizar valor existente
      chatUserData.value = value.trim();
      return await this.chatUserDataRepository.save(chatUserData);
    } else {
      // Crear nuevo dato
      chatUserData = this.chatUserDataRepository.create({
        chat_user_id: chatUserId,
        key: key.trim(),
        value: value.trim(),
      });
      return await this.chatUserDataRepository.save(chatUserData);
    }
  }

  async findByUserAndKey(chatUserId: number, key: string): Promise<ChatUserData | null> {
    return await this.chatUserDataRepository.findOne({
      where: { chat_user_id: chatUserId, key: key.trim() },
    });
  }

  async findAllByUser(chatUserId: number): Promise<ChatUserData[]> {
    return await this.chatUserDataRepository.find({
      where: { chat_user_id: chatUserId },
      order: { key: 'ASC' },
    });
  }

  async deleteByUserAndKey(chatUserId: number, key: string): Promise<boolean> {
    const result = await this.chatUserDataRepository.delete({
      chat_user_id: chatUserId,
      key: key.trim(),
    });
    return (result.affected || 0) > 0;
  }

  async deleteAllByUser(chatUserId: number): Promise<number> {
    const result = await this.chatUserDataRepository.delete({
      chat_user_id: chatUserId,
    });
    return result.affected || 0;
  }
}
