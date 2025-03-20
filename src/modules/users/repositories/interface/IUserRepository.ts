import { CreateUserDto } from '../../dto/create-user.dto';
import { User } from '../../entities/user.entity';

export abstract class IUserRepository {
  abstract save(data: CreateUserDto): Promise<User>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findById(id: string): Promise<User | null>;
}
