// const cds = require('@sap/cds')
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
    return { message: `Book ${ID} updated successfully` };
  });
  srv.on('READ', 'BookswithAuthors', async req => {
    const { ID, ...data } = req.data;
    const result = await cds.run(SELECT.from('BookswithAuthors'));
    if (result === 0) req.reject(404, `Book with ID ${ID} not found`);
    return { result };
  });
  srv.before ('CREATE','Orders', async req => {
    const order = req.data
    if (order.amount < 1 || !order.amount ) {
      req.error(400, 'Quantity must be at least 1')
    }
    const trx = cds.transaction(req)
    const book = await trx.run(SELECT.from(Books).where({ ID: order.book_ID }))
    if (book.length === 0 || !book) {
      throw new Error(`Book with ID ${order.book} not found`)
    }
    currentStock = book[0].stock
    console.log(book[0].stock)
    const newStock = currentStock - order.amount
    if (newStock < 0) {
      req.error(409, `Not enough stock for book ${order.book_ID}. Current stock: ${currentStock}, requested: ${order.amount}`);
    }
    const aff = await trx.run(UPDATE(Books).set({ stock: newStock }).where({ ID: order.book_ID }))
    if (aff === 0) {
      req.error(409, `Stock update failed due to concurrent modification.`);
    }
  })

  srv.after('CREATE', 'Orders', async (data, req) => {
    req._.res.status(200).json({
      message: 'Order created and stock updated successfully.',
      order: data
    });
  });
  // Add some discount for overstocked books
  srv.after ('READ','Books', each => {
    if (each.stock > 111)  each.title += ` -- 11% discount!`
  })
}