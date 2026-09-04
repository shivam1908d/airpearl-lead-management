import { Component } from '@angular/core';
import { HeaderComponent } from "./header/header.component";
import { RouterOutlet } from '@angular/router';
// import { DashboardComponent } from './dashboard/dashboard.component';
// import { LeadDashboardComponent } from './dashboard/lead-dashboard/lead-dashboard.component';
import { SidebarComponent } from './sidebar/sidebar.component';
 

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [HeaderComponent, RouterOutlet, SidebarComponent,], 
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent {
  isSidebarOpen = true;

toggleSidebar(){
  this.isSidebarOpen = !this.isSidebarOpen;
}

}
