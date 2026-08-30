import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { RegisterComponent } from './components/register/register';
import { VerifySuccessComponent } from './components/verify-success/verify-success';
import { VerifyErrorComponent } from './components/verify-error/verify-error';
import { VerifyExpiredComponent } from './components/verify-expired/verify-expired';
import { HomeComponent } from './components/home/home';
import { RoomCreateComponent } from './components/room-create/room-create';
import { TeamGameComponent } from './components/team-game/team-game';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'verify/success', component: VerifySuccessComponent },
  { path: 'verify/error', component: VerifyErrorComponent },
  { path: 'verify/expired', component: VerifyExpiredComponent },
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'rooms/create', component: RoomCreateComponent, canActivate: [authGuard] },
  { path: 'room/:code', component: TeamGameComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '/home' }
];
