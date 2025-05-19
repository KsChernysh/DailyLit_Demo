import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-create-topic',
  templateUrl: './create-topic.component.html',
  styleUrls: ['./create-topic.component.css']
})
export class CreateTopicComponent implements OnInit {
  club: any;
  topic = {
    title: '',
    clubId: 0,
    content: '' // Added content property
  };
  
  userProfile: any = null;
  initialComment = '';
  apiUrl = 'https://localhost:7172/api/Community';
  profileUrl = 'https://localhost:7172/api/Profile';
  loading = true;
  submitting = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const clubId = params.get('clubId');
      if (clubId) {
        this.topic.clubId = +clubId;
        this.loadClub(+clubId);
      } else {
        this.loading = false;
        this.error = 'Club ID is not specified';
      }
    });
  }

  loadClub(id: number): void {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}/Clubs/${id}`, { withCredentials: true })
      .subscribe({
        next: (data) => {
          this.club = data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading club:', error);
          this.loading = false;
          this.error = 'Error loading club data';
        }
      });
  }

  createTopic(): void {
    if (this.submitting) return;
    
    if (!this.topic.title.trim()) {
      this.error = 'Topic title is required';
      return;
    }
    
    if (!this.topic.content.trim()) {
      this.error = 'Topic content is required';
      return;
    }
    
    this.submitting = true;
    this.error = '';
    
    if (!this.club) {
      this.error = 'Error: club not loaded';
      this.submitting = false;
      return;
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    this.http.post<any>(
      `${this.apiUrl}/Topics`,
      this.topic,
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
            error: (error) => {
              console.error('Error adding comment:', error);
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
        console.error('Error creating topic:', error);
        this.submitting = false;
        if (error.error && typeof error.error === 'object') {
          if (error.error.errors) {
            const errorMessages = [];
            for (const key in error.error.errors) {
              errorMessages.push(`${key}: ${error.error.errors[key].join(', ')}`);
            }
            this.error = `Validation errors: ${errorMessages.join('; ')}`;
          } else {
            this.error = error.error.error || 'Error creating topic';
          }
        } else {
          this.error = 'Error creating topic';
        }
      }
    });
  }
}