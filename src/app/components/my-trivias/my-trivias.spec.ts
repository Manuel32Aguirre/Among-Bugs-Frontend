import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyTriviasComponent } from './my-trivias';

describe('MyTriviasComponent', () => {
  let component: MyTriviasComponent;
  let fixture: ComponentFixture<MyTriviasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyTriviasComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MyTriviasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TriviaService } from '../../services/trivia.service';

@Component({
  selector: 'app-my-trivias',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-trivias.html',
  styleUrls: ['./my-trivias.css']
})
export class MyTriviasComponent implements OnInit {
  myTrivias: any[] = [];
  loading: boolean = true;

  constructor(
    private router: Router,
    private triviaService: TriviaService
  ) {}

  ngOnInit(): void {
    this.loadMyTrivias();
  }

  loadMyTrivias(): void {
    this.triviaService.getMyTrivias().subscribe({
      next: (trivias) => {
        this.myTrivias = trivias;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar trivias:', err);
        this.loading = false;
      }
    });
  }

  goToCreateTrivia(): void {
    this.router.navigate(['/create-trivia']);
  }

  deleteTrivia(triviaId: number): void {
    if (confirm('¿Estás seguro de eliminar esta trivia?')) {
      this.triviaService.deleteTrivia(triviaId).subscribe({
        next: () => {
          alert('Trivia eliminada correctamente');
          this.loadMyTrivias();
        },
        error: (err) => {
          alert('Error al eliminar: ' + (err.error?.message || 'Error desconocido'));
        }
      });
    }
  }

  goToHome(): void {
    this.router.navigate(['/home']);
  }
}

