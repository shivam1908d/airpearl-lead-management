import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { authGuard } from './auth/auth.guard';
import { LayoutComponent } from './layout/layout.component';
import { DashboardsComponent } from './layout/dashboards/dashboards.component';
import { rosterComponent } from './layout/dashboards/roster/roster.component';
import { FdtlComponent } from './layout/dashboards/fdtl/fdtl.component';
import { LeadManagementComponent } from './layout/dashboards/lead-management/lead-management.component';
import { ExecutiveDashboardComponent } from './layout/dashboards/executive-dashboard/executive-dashboard.component';

export const routes: Routes = [

  { path: 'login', component: LoginComponent },   // < the login page

  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],                                       // (here we protect the layout and all its children)
    children: [


      {
        path: 'dashboards',
        component: DashboardsComponent,
        children: [
          { path: 'roster', component: rosterComponent },
          { path: 'fdtl', component: FdtlComponent },
          { path: 'lead-management', component: LeadManagementComponent },
          { path: 'executive-dashboard', component: ExecutiveDashboardComponent }
        ]
      },
      {
        path: '',
        redirectTo: 'dashboards/roster',
        pathMatch: 'full'
      }

    ]
  }

];