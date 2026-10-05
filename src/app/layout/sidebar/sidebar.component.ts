import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface MenuItem {
  label: string;  // Text shown in the navigation item.
  icon: string;   // PrimeIcons class used for the menu glyph.
  route: string;  // Route path must match the Angular router configuration.
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {

  // Grouped navigation keeps the app sections easy to scan while staying aligned with the route tree.
  menu: MenuSection[] = [
    {
      title: 'Dashboards',
      items: [
        { label: 'Roster',              icon: 'pi-calendar',   route: '/dashboards/roster' },
        { label: 'FDTL',                icon: 'pi-clock',      route: '/dashboards/fdtl' },
        { label: 'Lead Management',     icon: 'pi-users',      route: '/dashboards/lead-management' },
        { label: 'Executive Dashboard', icon: 'pi-chart-bar',  route: '/dashboards/executive-dashboard' },
      ],
    },
    {
      title: 'Training Program (TPM)',
      items: [
        { label: 'Courses',  icon: 'pi-book', route: '/training-program/courses' },
        { label: 'Aircraft', icon: 'pi-send', route: '/training-program/aircraft' },
      ],
    },
    {
      title: 'Leave',
      items: [
        { label: 'Leave Management', icon: 'pi-calendar-minus', route: '/leave/leave-management' },
      ],
    },
    {
      title: 'Users',
      items: [
        { label: 'User Management', icon: 'pi-user-edit', route: '/users/user-management' },
        { label: 'Instructor',      icon: 'pi-id-card',   route: '/users/instructor' },
        { label: 'Students',        icon: 'pi-user',      route: '/users/students' },
      ],
    },
  ];
}