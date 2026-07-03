import { getCollection } from 'astro:content';

export interface CourseMembership {
  courseId: string;
  courseTitle: string;
  chapterIndex: number;
  total: number;
  note?: string;
}

export type CollectionKind = 'posts' | 'wiki' | 'notes';

let cache: Promise<Map<string, CourseMembership[]>> | null = null;

async function build(): Promise<Map<string, CourseMembership[]>> {
  const courses = await getCollection('courses');
  const out = new Map<string, CourseMembership[]>();
  for (const course of courses) {
    const chapters = course.data.chapters;
    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      const key = `${ch.collection}:${ch.id}`;
      let list = out.get(key);
      if (!list) {
        list = [];
        out.set(key, list);
      }
      list.push({
        courseId: course.id,
        courseTitle: course.data.title,
        chapterIndex: i,
        total: chapters.length,
        note: ch.note,
      });
    }
  }
  return out;
}

export function getCourseMemberships(): Promise<Map<string, CourseMembership[]>> {
  if (!cache) cache = build();
  return cache;
}

export async function getMembershipsFor(
  collection: CollectionKind,
  slug: string,
): Promise<CourseMembership[]> {
  const map = await getCourseMemberships();
  return map.get(`${collection}:${slug}`) ?? [];
}
