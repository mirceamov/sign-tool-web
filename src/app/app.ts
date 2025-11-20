import { Component, signal } from '@angular/core';
import { PdfSignerComponent } from './components/pdf-signer/pdf-signer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PdfSignerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('sign-tool-web');
}