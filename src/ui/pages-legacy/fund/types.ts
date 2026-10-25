/** مستخدم مسجَّل في النظام كما يُعرض في شاشة العهد. */
export type FundUser = {
  id: string;
  name: string;
  email?: string;
  role?: string;
};
