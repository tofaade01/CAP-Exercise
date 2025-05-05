using { sap.capire as my } from '../db/schema';
service CatalogService {
  @cds.redirection.target
  entity Books as projection on my.Books;
  entity Authors as projection on my.Authors;
  entity BooksComplete as select from my.Books {
    ID,
    title,
    author.name   as author_name,
    genre.name    as genre_name,
    stock,
    prices
  };
  entity Genres as projection on my.Genres;
  entity Orders as projection on my.Orders;
} 
