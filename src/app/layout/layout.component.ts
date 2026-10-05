import { Component, HostListener, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './header/header.component';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { filter } from 'rxjs';

const DESKTOP_MIN_WIDTH = 768; // Matches the md breakpoint used by the app shell.

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, HeaderComponent, RouterOutlet, SidebarComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent implements OnDestroy {
  private router = inject(Router);

  isDesktop = window.innerWidth >= DESKTOP_MIN_WIDTH;
  isSidebarOpen = this.isDesktop; // Desktop keeps the sidebar open; mobile starts with it collapsed.

  // Close the mobile drawer as soon as the route changes so the navigation stays out of the way.
  private navSub = this.router.events
    .pipe(filter((e) => e instanceof NavigationEnd))
    .subscribe(() => {
      if (!this.isDesktop) { this.isSidebarOpen = false; }
    });

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  @HostListener('window:resize')
  onResize(): void {
    const desktop = window.innerWidth >= DESKTOP_MIN_WIDTH;
    if (desktop !== this.isDesktop) {
      this.isDesktop = desktop;
      this.isSidebarOpen = desktop;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.isDesktop) { this.closeSidebar(); }
  }

  ngOnDestroy(): void {
    this.navSub.unsubscribe();
  }
}