export const svgQuery = `query aavegotchis($ids: [ID!]){
  aavegotchis(where: { id_in: $ids }) {
    id
    svg
  }
}`;

const gotchisOwnedQuery = `gotchisOwned {
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
}`;

const portalsOwnedQuery = `portalsOwned {
  id
  hauntId
  openedAt
  historicalPrices
}`;

export const usersPortalsGotchisQuery = `query users($addresses: [ID!]){
  users(where: { id_in: $addresses }) {
    id
    ${gotchisOwnedQuery}
    ${portalsOwnedQuery}
  }
}`;

export const usersPortalsGotchisIdsQuery = `query users($addresses: [ID!]){
  users(where: { id_in: $addresses }) {
    id
    portalsOwned {
      id
    }
    gotchisOwned {
      id
    }
  }
}`;
