import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header', // This is the tag name you will use
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent { 
@Output() toggleSidebar = new EventEmitter();
  toggle() {
    this.toggleSidebar.emit();
  }


  isProfileOpen = false;

  toggleProfileMenu() {
    this.isProfileOpen = !this.isProfileOpen;
    alert("Profile menu toggled!:"+this.isProfileOpen); // This will show an alert when the profile menu is toggled
  }
}