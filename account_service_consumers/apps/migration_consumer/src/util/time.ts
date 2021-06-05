export async function delay(seconds: number): Promise<any> {
  return new Promise( resolve => setTimeout(resolve, seconds * 1000) );
}
