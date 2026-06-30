import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

const router = Router();

// Helper to get or create the default gym layout
async function getOrCreateDefaultLayout() {
  let layout = await prisma.gymLayout.findFirst({
    include: { equipment: true }
  });
  if (!layout) {
    layout = await prisma.gymLayout.create({
      data: {
        name: 'My Home Gym',
        width: 10,
        height: 10,
      },
      include: { equipment: true }
    });
  }
  return layout;
}

// 1. GET /api/layout - 取得健身房佈置與器材
router.get('/', async (req: Request, res: Response) => {
  try {
    const layout = await getOrCreateDefaultLayout();
    res.json(layout);
  } catch (error) {
    console.error('Error fetching layout:', error);
    res.status(500).json({ error: 'Failed to fetch gym layout' });
  }
});

// 2. POST /api/layout - 儲存健身房器材擺設 (覆蓋式更新)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, width, height, equipment } = req.body;
    const defaultLayout = await getOrCreateDefaultLayout();

    // 在交易中更新佈局，並覆蓋擺放的器材
    const updatedLayout = await prisma.$transaction(async (tx) => {
      // 1. 更新佈局基本資訊
      await tx.gymLayout.update({
        where: { id: defaultLayout.id },
        data: { name: name || defaultLayout.name, width: width || defaultLayout.width, height: height || defaultLayout.height }
      });

      // 2. 刪除所有原本未在此次清單中的器材 (若要完全以新清單為準，可以直接刪除全部重新建立)
      const incomingIds = (equipment || [])
        .map((eq: any) => eq.id)
        .filter((id: string) => !!id);

      // 刪除沒有出現在 incoming 列表中的器材
      await tx.placedEquipment.deleteMany({
        where: {
          layoutId: defaultLayout.id,
          id: { notIn: incomingIds }
        }
      });

      // 3. 處理更新與新建
      const savedEquipment = [];
      for (const eq of (equipment || [])) {
        if (eq.id) {
          // 已存在的器材，更新座標、角度與名稱
          const updated = await tx.placedEquipment.update({
            where: { id: eq.id },
            data: {
              customName: eq.customName,
              muscleGroup: eq.muscleGroup,
              gridX: eq.gridX,
              gridY: eq.gridY,
              rotation: eq.rotation,
            }
          });
          savedEquipment.push(updated);
        } else {
          // 新器材，建立之
          const created = await tx.placedEquipment.create({
            data: {
              layoutId: defaultLayout.id,
              type: eq.type,
              customName: eq.customName || eq.type,
              muscleGroup: eq.muscleGroup,
              gridX: eq.gridX,
              gridY: eq.gridY,
              rotation: eq.rotation || 0,
            }
          });
          savedEquipment.push(created);
        }
      }

      return tx.gymLayout.findUnique({
        where: { id: defaultLayout.id },
        include: { equipment: true }
      });
    });

    res.json(updatedLayout);
  } catch (error) {
    console.error('Error saving layout:', error);
    res.status(500).json({ error: 'Failed to save gym layout' });
  }
});

export default router;
