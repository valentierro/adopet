import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PetOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const petId = request.params?.id;
    if (!user?.id || !petId) return false;
    const pet = await this.prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) throw new NotFoundException('Pet não encontrado');
    if (pet.ownerId !== user.id) {
      throw new ForbiddenException('Apenas o dono pode editar este pet');
    }
    request.pet = pet;
    return true;
  }
}
