import { prisma } from "../../lib/prisma.js";
import redisClient from "../../lib/redis.js";

const CACHE_TTL = 300; // 5 মিনিট

/* ---------- School resolve by subdomain/custom domain ---------- */
export const resolveSchoolService = async (identifier: string) => {
  const cacheKey = `school:resolve:${identifier}`;

  const cached = await redisClient.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // corrupt cache — ignore and refetch
      await redisClient.del(cacheKey);
    }
  }

  const school = await prisma.school.findFirst({
    where: {
      OR: [
        { subdomain: identifier },
        { customDomain: identifier, domainVerified: true },
      ],
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      code: true,
      logo: true,
      tagline: true,
      description: true,
      primaryColor: true,
      secondaryColor: true,
      contactEmail: true,
      contactPhone: true,
      contactAddress: true,
      facebookUrl: true,
      youtubeUrl: true,
      mapEmbedUrl: true,
      schoolType: true,
    },
  });

  if (school) {
    await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(school));
  }

  return school;
};

/* ---------- School page content ---------- */
export const getPageContentService = async (schoolId: number, slug: string) => {
  return prisma.schoolPageContent.findUnique({
    where: { schoolId_slug: { schoolId, slug } },
  });
};

/* ---------- Public notices ---------- */
export const getNoticesService = async (
  schoolId: number,
  page = 1,
  limit = 10
) => {
  const skip = (page - 1) * limit;
  const where = {
    schoolId,
    isPublic: true,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  };

  const [notices, total] = await Promise.all([
    prisma.schoolNotice.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      skip,
      take: limit,
    }),
    prisma.schoolNotice.count({ where }),
  ]);

  return {
    notices,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/* ---------- Notice detail ---------- */
export const getNoticeByIdService = async (schoolId: number, id: number) => {
  return prisma.schoolNotice.findFirst({
    where: { id, schoolId, isPublic: true },
  });
};

/* ---------- Gallery ---------- */
export const getGalleryService = async (schoolId: number) => {
  return prisma.schoolGalleryImage.findMany({
    where: { schoolId, isPublic: true },
    orderBy: { sortOrder: "asc" },
  });
};

/* ---------- Contact form submit ---------- */
export const submitContactService = async (
  schoolId: number,
  input: {
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    message: string;
  },
  ip?: string,
  userAgent?: string
) => {
  return prisma.schoolContactMessage.create({
    data: { schoolId, ...input, ipAddress: ip, userAgent },
  });
};

/* ---------- Stats ---------- */
export const getSchoolStatsService = async (schoolId: number) => {
  const [students, teachers] = await Promise.all([
    prisma.student.count({ where: { schoolId, isActive: true } }),
    prisma.teacher.count({ where: { schoolId, isActive: true } }),
  ]);
  return { students, teachers };
};