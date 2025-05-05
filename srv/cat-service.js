const cds = require('@sap/cds')
// module.exports = async function (){

//   const db = await cds.connect.to('db') // connect to database service
//   const { Books } = db.entities         // get reflected definitions

//   // Reduce stock of ordered books if available stock suffices
//   this.on ('submitOrder', async req => {
//     const {book,quantity} = req.data
//     const n = await UPDATE (Books, book)
//       .with ({ stock: {'-=': quantity }})
//       .where ({ stock: {'>=': quantity }})
//     n > 0 || req.error (409,`${quantity} exceeds stock for book #${book}`)
//   })

//   // Add some discount for overstocked books
//   this.after ('READ','Books', each => {
//     if (each.stock > 111)  each.title += ` -- 11% discount!`
//   })
// }

module.exports = (srv)  => {
  const { Books } = cds.entities('sap.capire')

  // Reduce stock of ordered books if available stock suffices
  srv.on ('submitOrder', async req => {
    const {book,quantity} = req.data
    const n = await UPDATE (Books, book)
      .with ({ stock: {'-=': quantity }})
      .where ({ stock: {'>=': quantity }})
    n > 0 || req.error (409,`${quantity} exceeds stock for book #${book}`)
  });
  srv.on('UPDATE', 'Books', async req => {
    const { ID, ...data } = req.data;
    const result = await UPDATE('Books').set(data).where({ ID });
    if (result === 0) req.reject(404, `Book with ID ${ID} not found`);
    return { data, message: `Book ${ID} updated successfully` };
  });
  srv.on('DELETE', 'BooksComplete', async req => {
    const { ID } = req.data;
    const result = await DELETE.from('Books').where({ ID });
    if (result === 0) req.reject(404, `Book with ID ${ID} not found`);
    return { message: `Book ${ID} deleted successfully` };
  });
  srv.before('DELETE', 'Orders', async req => {
    const { ID } = req.data;
    const trx = cds.transaction(req)
    const order = await trx.run(SELECT.from('Orders').where({ ID }));
    console.log(ID)
    if (order.length === 0 || !order) {
      throw new Error(`Order with ID ${ID} not found`)
    }
    const book = await trx.run(SELECT.from(Books).where({ ID: order[0].book_ID }))
    if (book.length === 0 || !book) {
      throw new Error(`Book with ID ${order[0].book_ID} not found`)
    }
    currentStock = book[0].stock + order[0].amount
    console.log(currentStock)
    const result = await DELETE.from('Orders').where({ ID });
    if (result === 0) req.reject(404, `Order with ID ${ID} not found`);
    return { message: `Order ${ID} deleted successfully` };
  })
  // srv.on('READ', 'BooksComplete', async req => {
  //   const { ID, ...data } = req.data;
  //   const result = await cds.run(SELECT.from('BooksComplete'));
  //   if (result === 0) req.reject(404, `Book with ID ${ID} not found`);
  //   return { result };
  // });
  srv.before('CREATE','Orders', async req => {
    const order = req.data
    if (order.amount < 1 || !order.amount ) {
      req.error(400, 'Quantity must be at least 1')
    }
    const trx = cds.transaction(req)
    const book = await trx.run(SELECT.from(Books).where({ ID: order.book_ID }))
    if (book.length === 0 || !book) {
      throw new Error(`Book with ID ${order.book_ID} not found`)
    }
    currentStock = book[0].stock
    console.log(book[0].stock)
    const newStock = currentStock - order.amount
    if (newStock < 0) {
      req.error(403, `Not enough stock for book ${order.book_ID}. Current stock: ${currentStock}, requested: ${order.amount}`);
    }
    const aff = await trx.run(UPDATE(Books).set({ stock: newStock }).where({ ID: order.book_ID }))
    if (aff === 0) {
      req.error(409, `Stock update failed due to concurrent modification.`);
    }
  })
  srv.before('CREATE','Books', async req => {
    const book = req.data
    if (book.stock < 0 || !book.stock ) {
      req.error(400, 'Stock must be at least 0')
    }
    const trx = cds.transaction(req)
    const bookExists = await trx.run(SELECT.from(Books).where({ ID: book.ID }))
    if (bookExists.length > 0) {
      throw new Error(`Book with ID ${book.ID} already exists`)
    }
  });
  srv.before('UPDATE','Orders', async req => {
    const { ID, ...data } = req.data;
    const trx = cds.transaction(req)
    const order = await trx.run(SELECT.from('Orders').where({ ID }));
    if (order.length === 0 || !order) {
      throw new Error(`Order with ID ${ID} not found`)
    }
    const book = await trx.run(SELECT.from(Books).where({ ID: order[0].book_ID }))
    if (book.length === 0 || !book) {
      throw new Error(`Book with ID ${order[0].book_ID} not found`)
    }
    currentStock = book[0].stock
    console.log(book[0].stock)
    const newStock = currentStock + order[0].amount - data.amount
    if (newStock < 0) {
      req.error(403, `Not enough stock for book ${order[0].book_ID}. Current stock: ${currentStock}, requested: ${data.amount}`);
    }
    const aff = await trx.run(UPDATE(Books).set({ stock: newStock }).where({ ID: order[0].book_ID }))
    if (aff === 0) {
      req.error(409, `Stock update failed due to concurrent modification.`);
    }
  });
  // srv.before('DELETE','Orders', async req => {
  //   const { ID, ...data } = req.data;
  //   const trx = cds.transaction(req)
  //   const book = await trx.run(SELECT.from(Books).where({ book_ID }));
  //   if (book.length === 0 || !book) {
  //     throw new Error(`Book with ID ${book_ID} not found`)
  //   }
  //   const bookExists = await trx.run(SELECT.from(Books).where({ ID: data.ID }))
  //   if (bookExists.length > 0) {
  //     throw new Error(`Book with ID ${data.ID} already exists`)
  //   }
  // });
  srv.after('CREATE', 'Orders', async (data, req) => {
    req._.res.status(200).json({
      message: 'Order created and stock updated successfully.',
      orders: data
    });
  });
  srv.after('UPDATE', 'Orders', async (data, req) => {
    req._.res.status(200).json({ data,
      message: 'Order updated and stock updated successfully.',
    });
  })
  // srv.after('UPDATE', 'Books', async (data, req) => {
  //   req._.res.status(200).json({
  //     message: 'Books Updated Successfully.',
  //     books: data
  //   });
  // });
  srv.after('UPDATE', 'Books', async (data, req) => {
    req._.res.status(200).json({
      message: 'Books Updated Successfully.'
    })
  });
  srv.after('CREATE', 'Books', async (data, req) => {
    req._.res.status(200).json({ data,
      message: 'Books Created Successfully.'
    });
  });
  srv.after('DELETE', 'BooksComplete', async (data, req) => {
    req._.res.status(200).json({
      message: 'Books Deleted Successfully.'
    });
  });
  srv.after('DELETE', 'Orders', async (data, req) => {
    req._.res.status(200).json({
      message: 'Order Deleted Successfully.'
    });
  });
  // Add some discount for overstocked books
  srv.after('READ','BooksComplete', each => {
    if (each.stock > 111) each.title += ` -- 11% discount!`
    if (each.stock > 111) each.prices *= 0.89
  })
}