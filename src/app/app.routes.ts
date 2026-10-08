import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { authGuard } from './auth/auth.guard';
import { LayoutComponent } from './layout/layout.component';
import { DashboardsComponent } from './layout/dashboards/dashboards.component';
import { RosterComponent } from './layout/dashboards/roster/roster.component';
import { FdtlComponent } from './layout/dashboards/fdtl/fdtl.component';
import { LeadManagementComponent } from './layout/dashboards/lead-management/lead-management.component';
import { ExecutiveDashboardComponent } from './layout/dashboards/executive-dashboard/executive-dashboard.component';
import { CoursesComponent } from './layout/training-program/courses/courses.component';
import { AircraftComponent } from './layout/training-program/aircraft/aircraft.component';
import { LeaveManagementComponent } from './layout/leave/leave-management/leave-management.component';
import { UserManagementComponent } from './layout/users/user-management/user-management.component';
import { InstructorComponent } from './layout/users/instructor/instructor.component';
import { StudentsComponent } from './layout/users/students/students.component';

export const routes: Routes = [

  { path: 'login', component: LoginComponent }, // Public route for the sign-in screen.

  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard], // Protect the app shell and all nested dashboard pages.
    children: [


      {
        path: 'dashboards',
        component: DashboardsComponent,
        data: { breadcrumb: 'Dashboards' },
        children: [
          { path: 'roster', component: RosterComponent, data: { breadcrumb: 'Roster' } },
          { path: 'fdtl', component: FdtlComponent, data: { breadcrumb: 'FDTL' } },
          { path: 'lead-management', component: LeadManagementComponent, data: { breadcrumb: 'Lead Management' } },
          { path: 'executive-dashboard', component: ExecutiveDashboardComponent, data: { breadcrumb: 'Executive Dashboard' } }
        ]
      },

       // NEW: Training Program section (opens inside the same layout, protected by the same guard)
      {
        path: 'training-program',
        data: { breadcrumb: 'Training Program' },
        children: [
          { path: 'courses', component: CoursesComponent, data: { breadcrumb: 'Courses' } },
          { path: 'aircraft', component: AircraftComponent, data: { breadcrumb: 'Aircraft' } },
          { path: '', redirectTo: 'courses', pathMatch: 'full' }
        ]
      },
      {
        path: 'leave',
        data: { breadcrumb: 'Leave' },
        children: [
          { path: 'leave-management', component: LeaveManagementComponent, data: { breadcrumb: 'Leave Management' } },
          { path: '', redirectTo: 'leave-management', pathMatch: 'full' }
        ]
      },
      {
        path: 'users',
        data: { breadcrumb: 'Users' },
        children: [
          { path: 'user-management', component: UserManagementComponent, data: { breadcrumb: 'User Management' } },
          { path: 'instructor', component: InstructorComponent, data: { breadcrumb: 'Instructor' } },
          {path: 'students', component: StudentsComponent, data: { breadcrumb: 'Students' } },
          { path: '', redirectTo: 'user-management', pathMatch: 'full' }
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