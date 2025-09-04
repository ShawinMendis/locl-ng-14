import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

const name = '$localize';
const lib = 'Locl';

@Component({
  selector: 'locl-root',
  styleUrls: ['./app.component.scss'],
  templateUrl: './app.component.html',
  imports: [RouterOutlet],
})
export class AppComponent {
  title = $localize`Welcome to the demo of ${name} and ${lib} made for ${name}!`;

  constructor() {
    console.log($localize`:@@foo:custom id!`);
  }
}
