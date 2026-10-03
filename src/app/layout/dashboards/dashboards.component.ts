import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { RouterOutlet } from '@angular/router';


@Component({
  selector: 'app-dashboards',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './dashboards.component.html',
  styleUrl: './dashboards.component.css'
})

export class DashboardsComponent {

  pageTitle = '';

  constructor(private router: Router){

    this.router.events.subscribe(() => {

      if(this.router.url.includes('roster')){
        this.pageTitle = 'roster';
      }

      if(this.router.url.includes('fdtl')){
        this.pageTitle = 'FDTL';
      }

      if(this.router.url.includes('lead-management')){
        this.pageTitle = 'Lead Management';
      }

      if(this.router.url.includes('executive-dashboard')){  
        this.pageTitle = 'Executive Dashboard';
      }

    });

  }

}