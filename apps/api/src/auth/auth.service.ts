import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import {
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service.js';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

async function hash(password: string) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `${salt.toString('hex')}:${key.toString('hex')}`;
}

async function verify(password: string, stored: string) {
  const [salt, key] = stored.split(':');
  const expected = Buffer.from(key, 'hex');
  const actual = await scryptAsync(password, Buffer.from(salt, 'hex'), 64);
  return timingSafeEqual(actual, expected);
}

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // shortcut: un único usuario demo desde el entorno, sin registro; ampliar si se agrega gestión de usuarios.
  async onModuleInit() {
    const { DEMO_EMAIL, DEMO_PASSWORD } = process.env;
    if (!DEMO_EMAIL || !DEMO_PASSWORD) return;
    const existing = await this.prisma.user.findUnique({
      where: { email: DEMO_EMAIL },
    });
    if (existing) return;
    await this.prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        name: 'Técnico Demo',
        passwordHash: await hash(DEMO_PASSWORD),
      },
    });
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await verify(password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
    });
    return { accessToken, user: { id: user.id, name: user.name, email } };
  }
}
