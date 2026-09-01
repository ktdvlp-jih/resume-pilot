import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  data: { name: string; count: number }[];
  selectedTitle?: string | null;
};

export function ExperienceSkillChart({ data, selectedTitle }: Props) {
  const { t } = useTranslation();

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('experiences.mapSkillTitle')}</CardTitle>
        <CardDescription>
          {selectedTitle
            ? t('experiences.mapSkillSelected', { title: selectedTitle })
            : t('experiences.mapSkillAll')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('experiences.mapSkillEmpty')}</p>
        ) : (
          <div className="h-[240px] w-full">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
              <XAxis type="number" allowDecimals={false} hide />
              <YAxis
                type="category"
                dataKey="name"
                width={88}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} maxBarSize={20} />
            </BarChart>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
