import { Component, OnInit } from '@angular/core';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-countries',
  templateUrl: './countries.component.html',
  styleUrls: ['./countries.component.css'],
})
export class CountriesComponent implements OnInit {
  countries: any[] = [];
  loading = true;
  error: string | null = null;

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.dataService.getData().subscribe(
      (data) => {
        console.log('Fetched data:', data); // Add this line
        this.countries = data.countries;
        this.loading = false;
      },
      (error) => {
        console.error('Error:', error); // Add this line
        this.error = error;
        this.loading = false;
      }
    );
  }
}
