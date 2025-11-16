import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required'
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Sample package configurations with their data caps
const packageConfigs: Record<
  string,
  { capGB: number; baseUsageGB: number; variance: number }
> = {
  'home-a': { capGB: 50, baseUsageGB: 1.5, variance: 0.8 },
  'home-b': { capGB: 100, baseUsageGB: 3.2, variance: 1.5 },
  'home-c': { capGB: 200, baseUsageGB: 5.8, variance: 2.2 },
  'soho-pro': { capGB: 300, baseUsageGB: 8.5, variance: 3.0 },
  'soho-business': { capGB: 500, baseUsageGB: 12.3, variance: 4.5 },
  'soho-enterprise': { capGB: 1000, baseUsageGB: 18.7, variance: 6.8 },
  'corporate-business': { capGB: 1000, baseUsageGB: 22.1, variance: 8.2 },
  'corporate-enterprise': { capGB: 2000, baseUsageGB: 35.4, variance: 12.5 },
};

// Generate random usage data based on package
function generateUsageData(packageId: string, days = 30) {
  const config = packageConfigs[packageId] || packageConfigs['home-a'];
  const data = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Generate realistic usage with some randomness
    const dailyVariation = (Math.random() - 0.5) * config.variance;
    const weekendMultiplier =
      date.getDay() === 0 || date.getDay() === 6 ? 1.3 : 1.0;
    const totalDailyGB = Math.max(
      0.1,
      (config.baseUsageGB + dailyVariation) * weekendMultiplier
    );

    // Split between download and upload (typically 80/20 ratio)
    const downloadGB = totalDailyGB * 0.8;
    const uploadGB = totalDailyGB * 0.2;

    data.push({
      usage_date: date.toISOString().split('T')[0],
      download_bytes: Math.round(downloadGB * 1024 * 1024 * 1024),
      upload_bytes: Math.round(uploadGB * 1024 * 1024 * 1024),
    });
  }

  return data;
}

// Create sample data caps for users
async function createSampleDataCaps() {
  const sampleUsers = [
    { email: 'user1@example.com', package_id: 'home-a' },
    { email: 'user2@example.com', package_id: 'home-b' },
    { email: 'user3@example.com', package_id: 'home-c' },
    { email: 'business1@example.com', package_id: 'soho-pro' },
    { email: 'business2@example.com', package_id: 'soho-business' },
    { email: 'enterprise1@example.com', package_id: 'corporate-business' },
  ];

  for (const user of sampleUsers) {
    try {
      // Get user ID from email (this would normally come from your auth system)
      const { data: authUser } = await supabase.auth.admin.listUsers();
      const targetUser = authUser.users.find(u => u.email === user.email);

      if (!targetUser) {
        console.log(`User ${user.email} not found, skipping...`);
        continue;
      }

      const config = packageConfigs[user.package_id];
      const billingStart = new Date();
      billingStart.setDate(billingStart.getDate() - 15); // Mid-cycle start

      // Create data cap
      const { error: capError } = await supabase
        .from('data_caps')
        .upsert({
          user_id: targetUser.id,
          package_id: user.package_id,
          monthly_cap_gb: config.capGB,
          billing_cycle_start: billingStart.toISOString().split('T')[0],
          notification_thresholds: [80, 90, 100],
          is_active: true,
        })
        .select()
        .single();

      if (capError) {
        console.error(`Error creating data cap for ${user.email}:`, capError);
        continue;
      }

      console.log(`Created data cap for ${user.email}: ${config.capGB}GB`);

      // Generate and insert usage data
      const usageData = generateUsageData(user.package_id);

      for (const usage of usageData) {
        const { error: usageError } = await supabase
          .from('bandwidth_usage')
          .insert({
            user_id: targetUser.id,
            package_id: user.package_id,
            ...usage,
          });

        if (usageError) {
          console.error(
            `Error inserting usage data for ${user.email}:`,
            usageError
          );
        }
      }

      console.log(
        `Generated ${usageData.length} days of usage data for ${user.email}`
      );
    } catch (error) {
      console.error(`Error processing user ${user.email}:`, error);
    }
  }
}

// Generate some high-usage scenarios for testing notifications
async function createHighUsageScenarios() {
  const highUsageUser = {
    email: 'poweruser@example.com',
    package_id: 'home-a',
  };

  try {
    // Get user ID
    const { data: authUser } = await supabase.auth.admin.listUsers();
    const targetUser = authUser.users.find(
      u => u.email === highUsageUser.email
    );

    if (!targetUser) {
      console.log(`High usage user ${highUsageUser.email} not found`);
      return;
    }

    const config = packageConfigs[highUsageUser.package_id];
    const billingStart = new Date();
    billingStart.setDate(billingStart.getDate() - 20); // Earlier in cycle

    // Create data cap
    const { error: capError } = await supabase
      .from('data_caps')
      .upsert({
        user_id: targetUser.id,
        package_id: highUsageUser.package_id,
        monthly_cap_gb: config.capGB,
        billing_cycle_start: billingStart.toISOString().split('T')[0],
        notification_thresholds: [80, 90, 100],
        is_active: true,
      })
      .select()
      .single();

    if (capError) {
      console.error(`Error creating high usage data cap:`, capError);
      return;
    }

    // Generate high usage data (95% of cap)
    const targetUsageGB = config.capGB * 0.95;
    const days = 20;
    const dailyUsageGB = targetUsageGB / days;

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));

      const downloadGB = dailyUsageGB * 0.8;
      const uploadGB = dailyUsageGB * 0.2;

      const { error: usageError } = await supabase
        .from('bandwidth_usage')
        .insert({
          user_id: targetUser.id,
          package_id: highUsageUser.package_id,
          usage_date: date.toISOString().split('T')[0],
          download_bytes: Math.round(downloadGB * 1024 * 1024 * 1024),
          upload_bytes: Math.round(uploadGB * 1024 * 1024 * 1024),
        });

      if (usageError) {
        console.error(`Error inserting high usage data:`, usageError);
      }
    }

    console.log(
      `Created high usage scenario for ${highUsageUser.email} (${targetUsageGB.toFixed(2)}GB used)`
    );
  } catch (error) {
    console.error(`Error creating high usage scenario:`, error);
  }
}

// Main execution
async function main() {
  console.log('Starting bandwidth data simulation...');

  try {
    await createSampleDataCaps();
    await createHighUsageScenarios();
    console.log('Bandwidth data simulation completed successfully!');
  } catch (error) {
    console.error('Simulation failed:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  main,
  generateUsageData,
  createSampleDataCaps,
  createHighUsageScenarios,
};
