import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { RegisterComponent } from './components/register/register';
import { VerifySuccessComponent } from './components/verify-success/verify-success';
import { VerifyErrorComponent } from './components/verify-error/verify-error';
import { VerifyExpiredComponent } from './components/verify-expired/verify-expired';
import { HomeComponent } from './components/home/home';
import { CreateTriviaComponent } from './components/create-trivia/create-trivia';
import { EditTriviaComponent } from './components/edit-trivia/edit-trivia';
import { MyTriviasComponent } from './components/my-trivias/my-trivias';
import { RankingsComponent } from './components/rankings/rankings';
import { PlayTriviaComponent } from './components/play-trivia/play-trivia';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // 1. Redirige la raíz al login
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // 2. Define la ruta del componente Login
  { path: 'login', component: LoginComponent },

  // 3. Define la ruta para el Registro
  { path: 'register', component: RegisterComponent },

  // 4. Rutas de verificación
  { path: 'verify/success', component: VerifySuccessComponent },
  { path: 'verify/error', component: VerifyErrorComponent },
  { path: 'verify/expired', component: VerifyExpiredComponent },

  // 5. Ruta principal del home (protegida)
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },

  // 6. Ruta para crear trivia (protegida)
  { path: 'create-trivia', component: CreateTriviaComponent, canActivate: [authGuard] },

  // 6.1. Ruta para editar trivia (protegida)
  { path: 'edit-trivia/:id', component: EditTriviaComponent, canActivate: [authGuard] },

  // 7. Ruta para ver mis trivias (protegida)
  { path: 'my-trivias', component: MyTriviasComponent, canActivate: [authGuard] },

  // 8. Ruta para ver rankings (protegida)
  { path: 'rankings', component: RankingsComponent, canActivate: [authGuard] },

  // 9. Ruta para jugar trivia (protegida)
  { path: 'play-trivia/:id', component: PlayTriviaComponent, canActivate: [authGuard] },

  // 10. Ruta catch-all: cualquier ruta no definida redirije al login
  { path: '**', redirectTo: '/login' }
];
