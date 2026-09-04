// import { Routes } from '@angular/router';
// import { LayoutComponent } from './layout/layout.component';



// export const routes: Routes = [
//   {
//     path: '',
//     component: LayoutComponent,
    
//   }
// ];

import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { DashboardsComponent } from './layout/dashboards/dashboards.component';
import {RoasterComponent} from './layout/dashboards/roaster/roaster.component';
import { FdtlComponent } from './layout/dashboards/fdtl/fdtl.component';
import {LeadManagementComponent} from './layout/dashboards/lead-management/lead-management.component'

export const routes: Routes = [

  {
    path: '',
    component: LayoutComponent,
    children: [

      {
       path: 'dashboards',
       component: DashboardsComponent,
       children: [
      {
        path: 'roaster',
        component: RoasterComponent
      },
      {
       path: 'fdtl',
       component: FdtlComponent

      },

      {
        path: 'lead-management',
        component: LeadManagementComponent
      },

    
    ]
      },
      {
        path: '',
        redirectTo: 'dashboards/roaster',
        pathMatch: 'full'
      }

    ]
  }

];