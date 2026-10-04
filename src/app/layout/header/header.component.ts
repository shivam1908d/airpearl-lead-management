import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-header', // This is the tag name you will use
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  @Output() toggleSidebar = new EventEmitter();

  private auth = inject(AuthService);
  private router = inject(Router);

  isProfileOpen = false;

  get userName(): string {
    return this.auth.user?.name ?? 'User';
  }

  get userEmail(): string {
    return this.auth.user?.email ?? '';
  }

  /** "Shivam D" -> "SD", "Shivam" -> "S" */
  get initials(): string {
    return this.userName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }

  toggle() {
    this.toggleSidebar.emit();
  }

  toggleProfileMenu() {
    this.isProfileOpen = !this.isProfileOpen;
  }

  logout() {
    this.isProfileOpen = false;
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}