using { sap.capire as my } from '../db/schema';
service CatalogService {
  @cds.redirection.target
  entity Books as projection on my.Books;
  entity Authors @readonly as projection on my.Authors;
  entity BookswithAuthors as select from my.Books {
    ID,
    title,
    author.ID     as author_ID,
    author.name   as author_name
  };
  entity Genres as projection on my.Genres;
  entity Orders @insertonly as projection on my.Orders;
} 
