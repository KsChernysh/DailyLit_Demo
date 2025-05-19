import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-topic-detail',
  templateUrl: './topic-detail.component.html',
  styleUrls: ['./topic-detail.component.css']
})
export class TopicDetailComponent implements OnInit {
  topic: any = {
    title: '',
    clubId: 0,
    comments: [] // Initialize comments as an empty array
  };
  userProfile: any = null;
  newComment: string = '';
  replyingTo: any = null;
  loading = true;
  submitting = false;
  error = '';
  apiUrl = 'https://localhost:7172/api/Community';
  profileUrl = 'https://localhost:7172/api/Profile';
  initialComment: string = '';
  club: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    // Отримуємо профіль користувача при ініціалізації компонента
    this.getProfile();
    
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadTopic(+id);
      } else {
        this.loading = false;
        this.error = 'Ідентифікатор теми не вказано';
      }
    });
  }

  // Метод для отримання профілю користувача
  getProfile(): void {
    this.http.get(`${this.profileUrl}/profile`, { withCredentials: true })
      .subscribe({
        next: (data: any) => {
          this.userProfile = data;
          console.log('Отримано профіль користувача:', this.userProfile);
        },
        error: (error) => {
          console.error('Помилка при отриманні профілю:', error);
          this.error = 'Неможливо отримати профіль користувача. Перевірте, чи ви авторизовані.';
        }
      });
  }

  loadTopic(id: number): void {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}/Topics/${id}`, { withCredentials: true })
      .subscribe({
        next: (data) => {
          this.topic = data;
          // Ensure comments is properly initialized
          if (!this.topic.comments) {
            this.topic.comments = [];
          }
          
          // Debug log to see what comments are coming from the backend
          console.log('Topic loaded:', this.topic);
          console.log('Comments loaded:', this.topic.comments);
          console.log('Comment count:', this.topic.comments.length);
          
          this.loading = false;
        },
        error: (error) => {
          console.error('Помилка завантаження теми:', error);
          this.loading = false;
          this.error = 'Помилка завантаження теми';
        }
      });
  }

  // Add function to generate avatar colors based on username
  getAvatarColor(name: string): string {
    // Simple hash function to generate color based on name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Choose from pastel color palette
    const colors = [
      '#d2905b', // primary
      '#b57a49', // primary dark
      '#796356', // accent
      '#7c9b72', // success
      '#e9b872', // warning
      '#cc7352'  // error
    ];
    
    return colors[Math.abs(hash) % colors.length];
  }

  addComment(): void {
    if (!this.newComment.trim() || this.submitting) return;
    
    // Перевіряємо, чи отримано профіль користувача
    if (!this.userProfile) {
      // Якщо профіль не отриманий, спробуємо отримати його ще раз
      this.http.get(`${this.profileUrl}/profile`, { withCredentials: true })
        .subscribe({
          next: (data: any) => {
            this.userProfile = data;
            this.sendAddCommentRequest();
          },
          error: (error) => {
            console.error('Помилка при отриманні профілю:', error);
            this.error = 'Неможливо отримати профіль користувача. Перевірте, чи ви авторизовані.';
            this.submitting = false;
          }
        });
    } else {
      this.sendAddCommentRequest();
    }
  }

  private sendAddCommentRequest(): void {
    this.submitting = true;
    this.error = '';
    
    const comment = {
      text: this.newComment,
      topicId: this.topic.id,
      replyToCommentId: this.replyingTo?.id || null
    };

    this.http.post<any>(
      `${this.apiUrl}/Comments`, 
      comment, 
      { withCredentials: true }
    ).subscribe({
      next: (data) => {
        console.log('Успішно додано коментар:', data);
        if (!this.topic.comments) { // Ensure comments array exists before pushing
          this.topic.comments = [];
        }
        this.topic.comments.push(data);
        this.newComment = '';
        this.replyingTo = null;
        this.topic.lastActivityAt = data.createdAt;
        this.submitting = false;
      },
      error: (error) => {
        console.error('Помилка додавання коментаря:', error);
        this.submitting = false;
        
        if (error.error && typeof error.error === 'object') {
          if (error.error.errors) {
            const errorMessages = [];
            for (const key in error.error.errors) {
              errorMessages.push(`${key}: ${error.error.errors[key].join(', ')}`);
            }
            this.error = `Помилки валідації: ${errorMessages.join('; ')}`;
          } else if (error.error.error) {
            this.error = error.error.error;
          } else {
            this.error = 'Помилка при додаванні коментаря. Будь ласка, спробуйте знову.';
          }
        } else {
          this.error = 'Помилка при додаванні коментаря. Будь ласка, спробуйте знову.';
        }
      }
    });
  }

  likeComment(commentId: number): void {
    this.http.post<any>(`${this.apiUrl}/Comments/${commentId}/Like`, {}, { withCredentials: true })
      .subscribe({
        next: (data) => {
          // Оновлюємо кількість лайків у коментарі
          const comment = this.topic.comments.find((c: any) => c.id === commentId);
          if (comment) {
            comment.likes = data.likes;
            comment.userLiked = true;
          }
        },
        error: (error) => {
          console.error('Помилка при додаванні лайка:', error);
        }
      });
  }

  replyToComment(comment: any): void {
    this.replyingTo = comment;
    // Прокручуємо до форми коментарів
    setTimeout(() => {
      document.getElementById('commentTextarea')?.focus();
    }, 100);
  }

  cancelReply(): void {
    this.replyingTo = null;
  }

  createTopic(): void {
    if (this.submitting) return;
    if (!this.topic.title.trim()) {
      this.error = 'Назва теми обов\'язкова';
      return;
    }
    this.submitting = true;
    this.error = '';
    if (!this.club) {
      this.error = 'Помилка: клуб не завантажено. Спробуйте оновити сторінку.';
      this.submitting = false;
      return;
    }
    const topicToSend = {
      title: this.topic.title,
      clubId: this.topic.clubId
    };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    this.http.post<any>(
      `${this.apiUrl}/Topics`,
      topicToSend,
      { headers, withCredentials: true }
    ).subscribe({
      next: (topicData) => {
        if (this.initialComment.trim()) {
          const comment = {
            text: this.initialComment,
            topicId: topicData.id
          };
          this.http.post<any>(
            `${this.apiUrl}/Comments`,
            comment,
            { headers, withCredentials: true }
          ).subscribe({
            next: () => {
              this.submitting = false;
              this.router.navigate(['/topics', topicData.id]);
            },
            error: () => {
              this.submitting = false;
              this.router.navigate(['/topics', topicData.id]);
            }
          });
        } else {
          this.submitting = false;
          this.router.navigate(['/topics', topicData.id]);
        }
      },
      error: (error) => {
        this.submitting = false;
        if (error.error && typeof error.error === 'object' && error.error.errors) {
          const errorMessages = [];
          for (const key in error.error.errors) {
            errorMessages.push(`${key}: ${error.error.errors[key].join(', ')}`);
          }
          this.error = `Помилки валідації: ${errorMessages.join('; ')}`;
        } else {
          this.error = 'Помилка при створенні теми. Будь ласка, спробуйте знову.';
        }
      }
    });
  }
}