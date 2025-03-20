import { randomUUID } from 'crypto';
import { IUserRepository } from '../interface/IUserRepository';
import { User } from '../../entities/user.entity';
import { CreateUserDto } from '../../dto/create-user.dto';

export class UserInMemoryRepository implements IUserRepository {
  users: User[] = [];

  async findByEmail(email: string): Promise<User | null> {
    const findUser = this.users.find((user) => user.email === email);
    return findUser ?? null;
  }

  async save(data: CreateUserDto): Promise<User> {
    this.users.push({ ...data, id: randomUUID() });
    return data;
  }

  async findById(id: string): Promise<User | null> {
    const findUser = this.users.find((user) => user.id === id);

    return findUser ?? null;
  }
}
