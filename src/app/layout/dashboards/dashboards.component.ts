import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-dashboards',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './dashboards.component.html',
  styleUrl: './dashboards.component.css'
})
export class DashboardsComponent {}