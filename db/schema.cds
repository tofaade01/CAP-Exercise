using { managed, sap } from '@sap/cds/common';
namespace sap.capire; 

entity Books { 
  key ID : Integer;
  title  : localized String(111);
  author : Association to Authors;
  genre  : Association to Genres;
  stock  : Integer;
}
entity BookswithAuthors as select from Books { 
  ID,
  title,
  author.ID as author_ID,
  author.name as author_name
}
entity Authors { 
  key ID : Integer;
  name   : String(111);
  books  : Association to many Books on books.author = $self;
}

/** Hierarchically organized Code List for Genres */
entity Genres : sap.common.CodeList { 
  key ID   : Integer;
  parent   : Association to Genres;
  children : Composition of many Genres on children.parent = $self;
}

entity Orders : managed { 
  key ID : UUID;
  book   : Association to Books;
  amount : Integer;
}