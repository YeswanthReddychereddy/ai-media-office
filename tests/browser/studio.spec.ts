import {test,expect} from '@playwright/test';
test('Founder opens office, chats, watches production, inspects evidence and ideas, approves, then refreshes',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.getByRole('heading',{name:'Your studio, in motion.'})).toBeVisible();
 await page.getByRole('button',{name:'Open Maya, Research Analyst'}).click();
 await page.getByLabel('Message Maya').fill('What are you working on?');await page.getByRole('button',{name:'Send',exact:true}).click();await expect(page.getByText('This is a state-aware demo response.',{exact:false})).toBeVisible();await page.getByRole('button',{name:'Close panel'}).click();
 await page.getByRole('button',{name:'Start demo',exact:true}).click();
 await expect(page.getByText('concept package is ready',{exact:false}).first()).toBeVisible({timeout:30000});
 await page.getByRole('button',{name:'Open production',exact:true}).click();await page.getByRole('button',{name:'Tournament',exact:true}).click();await expect(page.getByText('Jury recommendation',{exact:true})).toBeVisible();await expect(page.locator('.idea-card')).toHaveCount(5);
 await page.getByRole('button',{name:'Artifacts',exact:true}).click();await page.getByRole('button',{name:/Research brief.*Version 1/}).click();await expect(page.getByRole('link',{name:/weather.gov/})).toBeVisible();await page.getByRole('button',{name:'Close panel'}).last().click();await page.getByRole('button',{name:'Close panel'}).click();
 await page.getByRole('button',{name:'Open CEO desk',exact:true}).click();await page.getByRole('button',{name:'Approve winner',exact:true}).click();await expect(page.getByText('Nothing waiting on your desk.')).toBeVisible();await page.getByRole('button',{name:'Close panel'}).click();
 await page.reload();await expect(page.getByRole('heading',{name:'Your studio, in motion.'})).toBeVisible();await expect.poll(async()=>{const r=await page.request.get('/api/company');return (await r.json()).projects[0].status}).toBe('complete');
 await page.screenshot({path:'test-results/office-desktop.png',fullPage:true});expect(errors).toEqual([]);
});
test('manager objective creates persistent jobs; mobile Founder controls remain reachable',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByRole('button',{name:'Talk to Atlas'}).click();await page.getByLabel('Message Atlas').fill('Objective: Explain lightning and thunder with a simple visual race.');await page.getByRole('button',{name:'Send',exact:true}).click();await expect(page.getByText('I created a project and queued the production plan.',{exact:false})).toBeVisible();await page.getByRole('button',{name:'Close panel'}).click();
 await page.getByRole('button',{name:'Operations',exact:true}).click();await expect(page.locator('.project-row')).toHaveCount(2);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Office',exact:true}).click();await expect(page.getByRole('button',{name:'Open Maya, Research Analyst'})).toBeVisible();await page.screenshot({path:'test-results/office-mobile.png',fullPage:true});
});
test('HTTP mutations reject cross-origin requests and invalid bodies',async({request})=>{
 const bad=await request.post('/api/company',{headers:{Origin:'https://evil.example'},data:{action:'create',title:'Bad','objective':'This should never run'}});expect(bad.status()).toBe(403);
 const invalid=await request.post('/api/company',{headers:{Origin:'http://127.0.0.1:3001'},data:{action:'decide',approvalId:'not-a-uuid',decision:'approve'}});expect(invalid.status()).toBe(400);
});
