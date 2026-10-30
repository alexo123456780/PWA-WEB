import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET es obligatorio');

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret,
      // Los técnicos pasan días sin red: un token corto los dejaría sin poder sincronizar.
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [JwtModule, AuthGuard],
})
export class AuthModule {}
