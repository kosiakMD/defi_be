export const svgQuery = `query aavegotchis($ids: [ID!]){
  aavegotchis(where: { id_in: $ids }) {
    id
    svg
  }
}`;

export const usersPolygonQuery = `query users($addresses: [ID!]){
  users(where: { id_in: $addresses }) {
    id
    gotchisOwned {
      id
      gotchiId
      name
      modifiedNumericTraits
      listings {
        seller
        buyer
        timePurchased
        priceInWei
      }
    }
  }
}`;
