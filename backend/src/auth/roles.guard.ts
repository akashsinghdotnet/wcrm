import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../users/user.entity';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles) {
            return true;
        }

        // In Community / Self-Hosted Edition, block Super-Admin SaaS platform endpoints
        const superAdminRoles = [UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.SUPERADMIN_STAFF];
        const isSuperadminOnly = requiredRoles.every(r => superAdminRoles.includes(r));
        if (process.env.DEPLOYMENT_MODE === 'self_hosted' && isSuperadminOnly) {
            throw new ForbiddenException('Super-Admin SaaS platform management is disabled in Community Edition.');
        }

        const { user } = context.switchToHttp().getRequest();
        if (process.env.DEPLOYMENT_MODE === 'self_hosted') {
            const isUserSuperAdmin = superAdminRoles.includes(user?.role) || (!user?.companyId && user?.role === UserRole.ADMIN);
            if (isUserSuperAdmin) {
                throw new ForbiddenException('Super-Admin access is disabled in Community Edition.');
            }
        }
        return requiredRoles.some((role) => user.role === role);
    }
}
