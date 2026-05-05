export interface RVListing {
  id: string;
  fb_url: string;
  year: number;
  price: number;
  photo_paths: string[];
  published_date: string;
  location: string;
  distance_miles: number;
  seller_name: string;
  seller_contact: string;
  ad_copy: string;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  listing_id: string;
  commenter_name: string;
  text: string;
  is_deletion_request: boolean;
  deletion_reason_type: "no_longer_relevant" | "too_far" | "other" | null;
  created_at: string;
  updated_at: string;
}

export interface VotePayload {
  direction: 1 | -1;
}

export interface CommentPayload {
  commenter_name: string;
  text: string;
  is_deletion_request: boolean;
  deletion_reason_type?: "no_longer_relevant" | "too_far" | "other";
}

export interface ScrapedData {
  year: number;
  price: number;
  location: string;
  seller_name: string;
  seller_contact: string;
  ad_copy: string;
  published_date: string;
  photo_urls: string[];
}
