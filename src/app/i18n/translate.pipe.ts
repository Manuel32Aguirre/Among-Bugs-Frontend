import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../services/language.service';

@Pipe({
  name: 't',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform {
  private lang = inject(LanguageService);

  transform(key: string, ...args: Array<string | number>): string {
    // Depend on signal so impure pipe refreshes on language change
    this.lang.lang();
    return this.lang.t(key, ...args);
  }
}
