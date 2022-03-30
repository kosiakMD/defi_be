export interface GithubFileDto {
  path: string;
  downloadUrl: string;
  content: string;
}

export interface GithubTreeItemDto {
  path: string;
  sha: string;
  type: string;
}
